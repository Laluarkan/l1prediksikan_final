from rest_framework.pagination import PageNumberPagination


class SeasonDataPagination(PageNumberPagination):
    """
    Pagination default tetap 20 (sama seperti sebelumnya) supaya endpoint lain
    yang tidak mengirim `page_size` tidak berubah perilakunya.

    Bedanya: sekarang klien BOLEH minta jumlah lebih besar lewat query param
    `?page_size=...`, dibatasi maksimal `max_page_size` supaya tidak disalahgunakan
    untuk request raksasa yang membebani server (selaras dengan setelan Anti-DDoS
    yang sudah ada).
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 1000